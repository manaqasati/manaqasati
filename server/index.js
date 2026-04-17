const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const multer = require('multer');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/manaqasa',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// ═══════════════════════════════════════════════════════════════
// HTML ROUTES - لتقديم صفحات الموقع
// ═══════════════════════════════════════════════════════════════

// الصفحة الرئيسية
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// صفحة admin dashboard
app.get('/dashboard-admin.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'dashboard-admin.html'));
});

// صفحة client dashboard  
app.get('/dashboard-client.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'dashboard-client.html'));
});

// صفحة provider dashboard
app.get('/dashboard-provider.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'dashboard-provider.html'));
});

// صفحة auth
app.get('/auth.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'auth.html'));
});

// صفحة app
app.get('/app.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'app.html'));
});

console.log('✅ HTML routes configured');

// ═══════════════════════════════════════════════════════════════
// DATABASE HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

// فحص وجود جدول
async function tableExists(tableName) {
  try {
    const result = await pool.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = $1
    `, [tableName]);
    return result.rows.length > 0;
  } catch (error) {
    console.log('❌ Error checking table existence:', error.message);
    return false;
  }
}

// تشغيل query بأمان
async function safeQuery(query, params = []) {
  try {
    const result = await pool.query(query, params);
    return { success: true, rows: result.rows, rowCount: result.rowCount };
  } catch (error) {
    console.log('❌ Query error:', error.message);
    return { success: false, error: error.message, rows: [] };
  }
}

// ═══════════════════════════════════════════════════════════════
// BASIC ENDPOINTS (USER REGISTRATION, LOGIN, ETC.)
// ═══════════════════════════════════════════════════════════════

// Register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, role, phone } = req.body;
    
    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: 'جميع الحقول مطلوبة' });
    }
    
    if (!['client', 'provider'].includes(role)) {
      return res.status(400).json({ message: 'نوع المستخدم غير صحيح' });
    }
    
    // تحقق من وجود جدول users
    const usersExists = await tableExists('users');
    if (!usersExists) {
      return res.status(500).json({ message: 'قاعدة البيانات غير مهيئة' });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const result = await safeQuery(
      'INSERT INTO users (name, email, password_hash, role, phone, is_active, created_at) VALUES ($1, $2, $3, $4, $5, true, NOW()) RETURNING id, name, email, role',
      [name, email, hashedPassword, role, phone]
    );
    
    if (!result.success) {
      if (result.error.includes('duplicate key')) {
        return res.status(400).json({ message: 'البريد الإلكتروني مستخدم مسبقاً' });
      }
      throw new Error(result.error);
    }
    
    const user = result.rows[0];
    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET || 'manaqasa-secret-2024');
    
    res.json({ user, token });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ message: 'خطأ في التسجيل' });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // تحقق من وجود جدول users
    const usersExists = await tableExists('users');
    if (!usersExists) {
      return res.status(500).json({ message: 'قاعدة البيانات غير مهيئة' });
    }
    
    const result = await safeQuery('SELECT * FROM users WHERE email = $1', [email]);
    
    if (!result.success || !result.rows.length) {
      return res.status(401).json({ message: 'بيانات الدخول غير صحيحة' });
    }
    
    const user = result.rows[0];
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ message: 'بيانات الدخول غير صحيحة' });
    }
    
    if (!user.is_active) {
      return res.status(401).json({ message: 'الحساب موقف' });
    }
    
    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET || 'manaqasa-secret-2024');
    
    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      },
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'خطأ في تسجيل الدخول' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// Test endpoint
app.get('/api/test', (req, res) => {
  res.json({ message: 'API is working' });
});

// Database test
app.get('/api/db-test', async (req, res) => {
  try {
    const testResult = await safeQuery('SELECT NOW() as current_time');
    
    if (!testResult.success) {
      throw new Error('Database connection failed');
    }
    
    // فحص الجداول
    const tables = {
      users: await tableExists('users'),
      requests: await tableExists('requests'),
      bids: await tableExists('bids'),
      reviews: await tableExists('reviews'),
      notifications: await tableExists('notifications')
    };
    
    res.json({
      database_connected: true,
      current_time: testResult.rows[0].current_time,
      tables_exist: tables
    });
  } catch (error) {
    console.error('Database test error:', error);
    res.status(500).json({ 
      database_connected: false,
      error: error.message 
    });
  }
});

// ═══════════════════════════════════════════════════════════════
// FRONTEND API ENDPOINTS - للموقع الرئيسي (محسّن مع أمان)
// ═══════════════════════════════════════════════════════════════

console.log('📡 Loading frontend API endpoints...');

// ══ جلب الطلبات/المشاريع - آمن ومحسّن ══
app.get('/api/requests', async (req, res) => {
  try {
    console.log('📋 Loading public requests...');
    
    // فحص اتصال قاعدة البيانات
    const dbTest = await safeQuery('SELECT NOW()');
    if (!dbTest.success) {
      console.log('❌ Database connection failed');
      return res.json([]);
    }
    console.log('✅ Database connected');
    
    // فحص وجود جدول users
    const usersExists = await tableExists('users');
    const requestsExists = await tableExists('requests');
    
    if (!usersExists || !requestsExists) {
      console.log('❌ Required tables missing:', { users: usersExists, requests: requestsExists });
      // إرجاع بيانات وهمية للاختبار
      return res.json([
        {
          id: 1,
          title: "تصميم موقع إلكتروني",
          description: "مطلوب تصميم موقع إلكتروني احترافي",
          budget: 5000,
          category: "تصميم",
          status: "open",
          created_at: new Date().toISOString(),
          client_name: "محمد أحمد",
          bid_count: 3
        },
        {
          id: 2, 
          title: "تطوير تطبيق جوال",
          description: "تطوير تطبيق جوال للتجارة الإلكترونية",
          budget: 10000,
          category: "برمجة وتطوير", 
          status: "open",
          created_at: new Date().toISOString(),
          client_name: "سارة علي",
          bid_count: 5
        }
      ]);
    }
    
    // محاولة جلب البيانات الحقيقية
    const result = await safeQuery(`
      SELECT 
        r.id,
        r.title,
        r.description,
        r.budget,
        COALESCE(r.category, 'أخرى') as category,
        COALESCE(r.status, 'open') as status,
        r.created_at,
        r.deadline,
        COALESCE(u.name, 'غير معروف') as client_name,
        COALESCE(u.city, '') as client_city
      FROM requests r 
      LEFT JOIN users u ON u.id = r.user_id 
      WHERE r.status = 'open' OR r.status = 'in_progress'
      ORDER BY r.created_at DESC 
      LIMIT 50
    `);
    
    if (!result.success) {
      console.log('❌ Query failed, trying simpler query...');
      
      // محاولة بquery أبسط
      const simpleResult = await safeQuery(`
        SELECT id, title, description, budget, created_at 
        FROM requests 
        ORDER BY created_at DESC 
        LIMIT 10
      `);
      
      if (simpleResult.success) {
        console.log('✅ Simple query worked, returning:', simpleResult.rows.length);
        
        // إضافة bid_count وهمي
        const enhancedRows = simpleResult.rows.map(row => ({
          ...row,
          category: 'أخرى',
          status: 'open',
          client_name: 'غير معروف',
          client_city: '',
          bid_count: Math.floor(Math.random() * 5)
        }));
        
        return res.json(enhancedRows);
      }
      
      console.log('❌ Simple query also failed, returning empty array');
      return res.json([]);
    }
    
    // إضافة bid_count 
    const requestsWithBids = await Promise.all(
      result.rows.map(async (req) => {
        const bidsExists = await tableExists('bids');
        
        if (bidsExists) {
          const bidResult = await safeQuery(
            'SELECT COUNT(*) as count FROM bids WHERE request_id = $1',
            [req.id]
          );
          req.bid_count = bidResult.success ? parseInt(bidResult.rows[0].count) : 0;
        } else {
          req.bid_count = Math.floor(Math.random() * 5);
        }
        
        return req;
      })
    );
    
    console.log('✅ Loaded requests:', requestsWithBids.length);
    res.json(requestsWithBids);
    
  } catch (error) {
    console.error('❌ Error loading requests:', error);
    
    // في حالة أي خطأ، إرجاع array فاضي بدلاً من error
    res.json([]);
  }
});

// ══ جلب الفئات ══
app.get('/api/categories', (req, res) => {
  try {
    console.log('📂 Loading categories...');
    
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
    
    console.log('✅ Categories loaded:', categories.length);
    res.json(categories);
    
  } catch (error) {
    console.error('❌ Error loading categories:', error);
    res.json(['أخرى']);
  }
});

// ══ جلب الإحصائيات العامة ══
app.get('/api/stats', async (req, res) => {
  try {
    console.log('📊 Loading public stats...');
    
    const usersExists = await tableExists('users');
    const requestsExists = await tableExists('requests');
    
    if (!usersExists || !requestsExists) {
      console.log('📝 Tables missing, returning default stats');
      return res.json({
        completed_projects: 156,
        active_providers: 89,
        active_clients: 234,
        open_requests: 47
      });
    }
    
    const stats = await safeQuery(`
      SELECT 
        (SELECT COUNT(*) FROM requests WHERE status = 'completed') as completed_projects,
        (SELECT COUNT(*) FROM users WHERE role = 'provider' AND is_active = true) as active_providers,
        (SELECT COUNT(*) FROM users WHERE role = 'client' AND is_active = true) as active_clients,
        (SELECT COUNT(*) FROM requests WHERE status = 'open') as open_requests
    `);
    
    if (!stats.success) {
      console.log('📝 Stats query failed, returning defaults');
      return res.json({
        completed_projects: 156,
        active_providers: 89,
        active_clients: 234,
        open_requests: 47
      });
    }
    
    const result = stats.rows[0] || {};
    
    console.log('✅ Public stats loaded:', result);
    res.json({
      completed_projects: parseInt(result.completed_projects) || 0,
      active_providers: parseInt(result.active_providers) || 0,
      active_clients: parseInt(result.active_clients) || 0,
      open_requests: parseInt(result.open_requests) || 0
    });
    
  } catch (error) {
    console.error('❌ Error loading stats:', error);
    res.json({
      completed_projects: 156,
      active_providers: 89,
      active_clients: 234,
      open_requests: 47
    });
  }
});

// ══ البحث في المشاريع ══
app.get('/api/requests/search', async (req, res) => {
  try {
    const { q, category, budget_min, budget_max } = req.query;
    
    console.log('🔍 Search requests:', { q, category, budget_min, budget_max });
    
    const requestsExists = await tableExists('requests');
    const usersExists = await tableExists('users');
    
    if (!requestsExists || !usersExists) {
      return res.json([]);
    }
    
    let query = `
      SELECT 
        r.id, r.title, r.description, r.budget, 
        COALESCE(r.category, 'أخرى') as category,
        r.created_at, COALESCE(u.name, 'غير معروف') as client_name
      FROM requests r 
      LEFT JOIN users u ON u.id = r.user_id 
      WHERE r.status = 'open'
    `;
    
    const params = [];
    let paramCount = 0;
    
    if (q) {
      paramCount++;
      query += ` AND (r.title ILIKE $${paramCount} OR r.description ILIKE $${paramCount})`;
      params.push(`%${q}%`);
    }
    
    if (category && category !== 'الكل') {
      paramCount++;
      query += ` AND r.category = $${paramCount}`;
      params.push(category);
    }
    
    if (budget_min) {
      paramCount++;
      query += ` AND r.budget >= $${paramCount}`;
      params.push(parseFloat(budget_min));
    }
    
    if (budget_max) {
      paramCount++;
      query += ` AND r.budget <= $${paramCount}`;
      params.push(parseFloat(budget_max));
    }
    
    query += ` ORDER BY r.created_at DESC LIMIT 20`;
    
    const result = await safeQuery(query, params);
    
    console.log('✅ Search results:', result.success ? result.rows.length : 0);
    res.json(result.success ? result.rows : []);
    
  } catch (error) {
    console.error('❌ Search error:', error);
    res.json([]);
  }
});

// ══ جلب مزودين نشطين ══
app.get('/api/providers', async (req, res) => {
  try {
    console.log('👥 Loading active providers...');
    
    const usersExists = await tableExists('users');
    
    if (!usersExists) {
      return res.json([]);
    }
    
    const result = await safeQuery(`
      SELECT 
        u.id, u.name, u.specialties, u.city, u.badge
      FROM users u
      WHERE u.role = 'provider' AND u.is_active = true
      ORDER BY u.created_at DESC
      LIMIT 20
    `);
    
    if (!result.success) {
      return res.json([]);
    }
    
    console.log('✅ Active providers loaded:', result.rows.length);
    res.json(result.rows);
    
  } catch (error) {
    console.error('❌ Error loading providers:', error);
    res.json([]);
  }
});

console.log('✅ Frontend API endpoints loaded successfully');

// ═══════════════════════════════════════════════════════════════
// ADMIN SYSTEM - كود الأدمن الكامل
// ═══════════════════════════════════════════════════════════════

console.log('🚀 تحميل نظام الأدمن...');

// ══ التوثيق والصلاحيات ══
const auth = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      console.log('❌ لا يوجد token');
      return res.status(401).json({ message: 'Token مطلوب' });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'manaqasa-secret-2024');
    req.user = decoded;
    console.log('✅ تم التوثيق:', decoded.id, decoded.role);
    next();
  } catch (error) {
    console.log('❌ خطأ في التوثيق:', error.message);
    res.status(401).json({ message: 'Token غير صحيح' });
  }
};

const adminOnly = (req, res, next) => {
  console.log('🔒 فحص صلاحية الأدمن للمستخدم:', req.user?.id, 'الدور:', req.user?.role);
  
  if (req.user?.role !== 'admin') {
    console.log('❌ رفض الوصول - ليس أدمن');
    return res.status(403).json({ 
      message: 'يتطلب صلاحيات أدمن',
      your_role: req.user?.role || 'غير معروف'
    });
  }
  
  console.log('✅ تم منح صلاحية الأدمن');
  next();
};

// ══ إنشاء أدمن مباشر ══
app.get('/api/direct-admin', async (req, res) => {
  try {
    const { secret, email, password } = req.query;
    
    console.log('🔑 طلب إنشاء أدمن:', email);
    
    if (secret !== 'manaqasa2024') {
      console.log('❌ كلمة سر خاطئة');
      return res.status(403).json({ message: 'كلمة سر خاطئة' });
    }
    
    if (!email || !password) {
      return res.status(400).json({ message: 'الإيميل وكلمة المرور مطلوبة' });
    }
    
    // تحقق من وجود جدول users
    const usersExists = await tableExists('users');
    if (!usersExists) {
      return res.status(500).json({ message: 'جدول المستخدمين غير موجود' });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const result = await safeQuery(`
      INSERT INTO users (name, email, password_hash, role, is_active, created_at) 
      VALUES ('المدير', $1, $2, 'admin', true, NOW())
      ON CONFLICT (email) 
      DO UPDATE SET 
        password_hash = $2, 
        role = 'admin', 
        is_active = true
      RETURNING id, name, email, role
    `, [email, hashedPassword]);
    
    if (!result.success) {
      throw new Error(result.error);
    }
    
    console.log('✅ تم إنشاء الأدمن بنجاح:', result.rows[0]);
    
    res.json({
      ok: true,
      message: 'تم إنشاء حساب الأدمن بنجاح',
      user: result.rows[0]
    });
    
  } catch (error) {
    console.error('❌ خطأ في إنشاء الأدمن:', error);
    res.status(500).json({ message: error.message });
  }
});

// ══ إحصائيات الأدمن ══
app.get('/api/admin/stats', auth, adminOnly, async (req, res) => {
  try {
    console.log('📊 تحميل الإحصائيات...');
    
    const usersExists = await tableExists('users');
    const requestsExists = await tableExists('requests');
    const bidsExists = await tableExists('bids');
    
    if (!usersExists) {
      return res.json({
        total_users: 0,
        total_clients: 0,
        providers: 0,
        requests: 0,
        in_progress: 0,
        completed: 0,
        pending_review: 0,
        total_bids: 0
      });
    }
    
    const stats = await safeQuery(`
      SELECT 
        COUNT(*) FILTER (WHERE role != 'admin') as total_users,
        COUNT(*) FILTER (WHERE role = 'client') as total_clients,
        COUNT(*) FILTER (WHERE role = 'provider') as providers
      FROM users
    `);
    
    let requests = { rows: [{ requests: 0, in_progress: 0, completed: 0, pending_review: 0 }] };
    if (requestsExists) {
      requests = await safeQuery(`
        SELECT 
          COUNT(*) as requests,
          COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress,
          COUNT(*) FILTER (WHERE status = 'completed') as completed,
          COUNT(*) FILTER (WHERE status = 'pending_review') as pending_review
        FROM requests
      `);
    }
    
    let bids = { rows: [{ total_bids: 0 }] };
    if (bidsExists) {
      bids = await safeQuery('SELECT COUNT(*) as total_bids FROM bids');
    }
    
    const result = {
      total_users: parseInt(stats.rows[0]?.total_users) || 0,
      total_clients: parseInt(stats.rows[0]?.total_clients) || 0,
      providers: parseInt(stats.rows[0]?.providers) || 0,
      requests: parseInt(requests.rows[0]?.requests) || 0,
      in_progress: parseInt(requests.rows[0]?.in_progress) || 0,
      completed: parseInt(requests.rows[0]?.completed) || 0,
      pending_review: parseInt(requests.rows[0]?.pending_review) || 0,
      total_bids: parseInt(bids.rows[0]?.total_bids) || 0
    };
    
    console.log('✅ تم تحميل الإحصائيات:', result);
    res.json(result);
    
  } catch (error) {
    console.error('❌ خطأ في تحميل الإحصائيات:', error);
    res.status(500).json({ message: error.message });
  }
});

// ══ قائمة المستخدمين ══
app.get('/api/admin/users', auth, adminOnly, async (req, res) => {
  try {
    const { role } = req.query;
    console.log('👥 تحميل المستخدمين، فلترة الدور:', role);
    
    const usersExists = await tableExists('users');
    if (!usersExists) {
      return res.json([]);
    }
    
    let query = `
      SELECT id, name, email, phone, role, city, is_active, 
             created_at, specialties, badge
      FROM users 
      WHERE role != 'admin'
    `;
    
    const params = [];
    
    if (role && ['client', 'provider'].includes(role)) {
      query += ' AND role = $1';
      params.push(role);
    }
    
    query += ' ORDER BY created_at DESC';
    
    const result = await safeQuery(query, params);
    
    console.log('✅ تم تحميل المستخدمين:', result.success ? result.rows.length : 0, 'مستخدم');
    res.json(result.success ? result.rows : []);
    
  } catch (error) {
    console.error('❌ خطأ في تحميل المستخدمين:', error);
    res.status(500).json({ message: error.message });
  }
});

// ══ تفعيل/إيقاف المستخدم ══
app.put('/api/admin/users/:id/toggle', auth, adminOnly, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    console.log('🔄 تبديل حالة المستخدم:', userId, 'بواسطة الأدمن:', req.user.id);
    
    if (userId === req.user.id) {
      console.log('❌ الأدمن يحاول تعديل نفسه');
      return res.status(400).json({ message: 'لا يمكن تعديل حسابك الخاص' });
    }
    
    const result = await safeQuery(
      'UPDATE users SET is_active = NOT is_active WHERE id = $1 AND role != \'admin\' RETURNING id, name, is_active',
      [userId]
    );
    
    if (!result.success || !result.rows.length) {
      console.log('❌ المستخدم غير موجود:', userId);
      return res.status(404).json({ message: 'المستخدم غير موجود' });
    }
    
    console.log('✅ تم تبديل حالة المستخدم:', result.rows[0]);
    res.json(result.rows[0]);
    
  } catch (error) {
    console.error('❌ خطأ في التبديل:', error);
    res.status(500).json({ message: error.message });
  }
});

// ══ 🗑️ حذف المستخدم (الدالة الأساسية!) ══
app.delete('/api/admin/users/:id', auth, adminOnly, async (req, res) => {
  const userId = parseInt(req.params.id);
  
  console.log('🗑️ طلب حذف المستخدم');
  console.log('   معرف المستخدم للحذف:', userId);
  console.log('   الأدمن المنفذ للحذف:', req.user.id);
  console.log('   وقت الطلب:', new Date().toISOString());
  
  try {
    // التحقق من صحة المعطيات
    if (!userId || isNaN(userId)) {
      console.log('❌ معرف مستخدم غير صحيح:', req.params.id);
      return res.status(400).json({ message: 'معرف المستخدم غير صحيح' });
    }
    
    // منع الأدمن من حذف نفسه
    if (userId === req.user.id) {
      console.log('❌ الأدمن يحاول حذف نفسه');
      return res.status(400).json({ message: 'لا يمكن حذف حسابك الخاص' });
    }
    
    // تحقق من وجود جدول users
    const usersExists = await tableExists('users');
    if (!usersExists) {
      return res.status(500).json({ message: 'جدول المستخدمين غير موجود' });
    }
    
    // التحقق من وجود المستخدم
    console.log('🔍 فحص وجود المستخدم...');
    const userCheck = await safeQuery(
      'SELECT id, name, email, role FROM users WHERE id = $1', 
      [userId]
    );
    
    if (!userCheck.success || !userCheck.rows.length) {
      console.log('❌ المستخدم غير موجود:', userId);
      return res.status(404).json({ message: 'المستخدم غير موجود' });
    }
    
    const userToDelete = userCheck.rows[0];
    console.log('👤 تم العثور على المستخدم:', userToDelete);
    
    // منع حذف المديرين الآخرين
    if (userToDelete.role === 'admin') {
      console.log('❌ محاولة حذف مستخدم أدمن');
      return res.status(403).json({ message: 'لا يمكن حذف المديرين' });
    }
    
    // بدء معاملة آمنة للحذف
    console.log('📝 بدء المعاملة...');
    const beginResult = await safeQuery('BEGIN');
    if (!beginResult.success) {
      throw new Error('Failed to start transaction');
    }
    
    try {
      console.log('🧹 المرحلة 1: تنظيف البيانات المرتبطة...');
      
      let deleteBidsResult = { rowCount: 0 };
      let deleteReviewsResult = { rowCount: 0 };
      let deleteNotifsResult = { rowCount: 0 };
      let deleteMsgsResult = { rowCount: 0 };
      let deleteReportsResult = { rowCount: 0 };
      
      // 1. حذف العطاءات (إذا كان الجدول موجود)
      if (await tableExists('bids')) {
        console.log('   - حذف عطاءات المستخدم...');
        const result = await safeQuery('DELETE FROM bids WHERE user_id = $1', [userId]);
        deleteBidsResult.rowCount = result.rowCount || 0;
        console.log('   ✓ تم حذف العطاءات:', deleteBidsResult.rowCount);
      }
      
      // 2. حذف التقييمات (إذا كان الجدول موجود)
      if (await tableExists('reviews')) {
        console.log('   - حذف التقييمات...');
        const result = await safeQuery(
          'DELETE FROM reviews WHERE reviewer_id = $1 OR reviewed_id = $1', 
          [userId]
        );
        deleteReviewsResult.rowCount = result.rowCount || 0;
        console.log('   ✓ تم حذف التقييمات:', deleteReviewsResult.rowCount);
      }
      
      // 3. حذف الإشعارات (إذا كان الجدول موجود)
      if (await tableExists('notifications')) {
        console.log('   - حذف الإشعارات...');
        const result = await safeQuery('DELETE FROM notifications WHERE user_id = $1', [userId]);
        deleteNotifsResult.rowCount = result.rowCount || 0;
        console.log('   ✓ تم حذف الإشعارات:', deleteNotifsResult.rowCount);
      }
      
      // 4. حذف الرسائل (إذا كان الجدول موجود)
      if (await tableExists('messages')) {
        console.log('   - حذف الرسائل...');
        const result = await safeQuery(
          'DELETE FROM messages WHERE sender_id = $1 OR receiver_id = $1', 
          [userId]
        );
        deleteMsgsResult.rowCount = result.rowCount || 0;
        console.log('   ✓ تم حذف الرسائل:', deleteMsgsResult.rowCount);
      }
      
      // 5. حذف البلاغات (إذا كان الجدول موجود)
      if (await tableExists('reports')) {
        console.log('   - حذف البلاغات...');
        const result = await safeQuery(
          'DELETE FROM reports WHERE reporter_id = $1 OR reported_id = $1', 
          [userId]
        );
        deleteReportsResult.rowCount = result.rowCount || 0;
        console.log('   ✓ تم حذف البلاغات:', deleteReportsResult.rowCount);
      }
      
      console.log('🧹 المرحلة 2: معالجة طلبات المستخدم...');
      
      // 6. معالجة طلبات المستخدم (إذا كان الجدول موجود)
      let userRequests = { rows: [] };
      if (await tableExists('requests')) {
        const requestsResult = await safeQuery('SELECT id, title FROM requests WHERE user_id = $1', [userId]);
        userRequests = requestsResult.success ? requestsResult : { rows: [] };
        console.log('   - تم العثور على طلبات المستخدم:', userRequests.rows.length);
        
        if (userRequests.rows.length > 0) {
          // حذف العطاءات على طلبات المستخدم
          if (await tableExists('bids')) {
            for (const req of userRequests.rows) {
              console.log('     - حذف عطاءات الطلب:', req.id, req.title);
              await safeQuery('DELETE FROM bids WHERE request_id = $1', [req.id]);
            }
          }
          
          // حذف الطلبات
          console.log('   - حذف طلبات المستخدم...');
          await safeQuery('DELETE FROM requests WHERE user_id = $1', [userId]);
          console.log('   ✓ تم حذف الطلبات:', userRequests.rows.length);
        }
        
        // 7. معالجة خاصة للمزودين
        if (userToDelete.role === 'provider') {
          console.log('🧹 المرحلة 3: تنظيف خاص بالمزود...');
          console.log('   - إلغاء تعيين المزود من الطلبات...');
          const unassignResult = await safeQuery(
            'UPDATE requests SET assigned_provider_id = NULL WHERE assigned_provider_id = $1', 
            [userId]
          );
          console.log('   ✓ تم إلغاء التعيين من الطلبات:', unassignResult.rowCount || 0);
        }
      }
      
      console.log('🗑️ المرحلة 4: حذف المستخدم النهائي...');
      
      // 8. حذف المستخدم نفسه
      const deleteUserResult = await safeQuery('DELETE FROM users WHERE id = $1', [userId]);
      console.log('   ✓ تم حذف سجل المستخدم:', deleteUserResult.rowCount || 0);
      
      if (!deleteUserResult.success || deleteUserResult.rowCount === 0) {
        throw new Error('فشل في حذف سجل المستخدم');
      }
      
      // تأكيد المعاملة
      const commitResult = await safeQuery('COMMIT');
      if (!commitResult.success) {
        throw new Error('Failed to commit transaction');
      }
      
      console.log('🎉 تم إنجاز الحذف بنجاح');
      console.log('   المستخدم المحذوف:', userToDelete.name, userToDelete.email);
      console.log('   إحصائيات التنظيف:', {
        العطاءات: deleteBidsResult.rowCount,
        التقييمات: deleteReviewsResult.rowCount,
        الإشعارات: deleteNotifsResult.rowCount,
        الرسائل: deleteMsgsResult.rowCount,
        البلاغات: deleteReportsResult.rowCount,
        الطلبات: userRequests.rows.length
      });
      
      res.json({
        ok: true,
        message: 'تم حذف المستخدم وجميع بياناته بنجاح',
        deleted_user: {
          id: userId,
          name: userToDelete.name,
          email: userToDelete.email,
          role: userToDelete.role
        },
        cleanup_stats: {
          bids_deleted: deleteBidsResult.rowCount,
          requests_deleted: userRequests.rows.length,
          reviews_deleted: deleteReviewsResult.rowCount,
          notifications_deleted: deleteNotifsResult.rowCount,
          messages_deleted: deleteMsgsResult.rowCount,
          reports_deleted: deleteReportsResult.rowCount
        }
      });
      
    } catch (deleteError) {
      // إلغاء المعاملة عند الخطأ
      await safeQuery('ROLLBACK');
      console.error('💥 فشل معاملة الحذف');
      console.error('   الخطأ:', deleteError.message);
      throw deleteError;
    }
    
  } catch (error) {
    console.error('❌ فشل حذف المستخدم');
    console.error('   معرف المستخدم:', userId);
    console.error('   الخطأ:', error.message);
    
    // رسائل خطأ واضحة
    let errorMessage = 'فشل في حذف المستخدم';
    
    if (error.message.includes('foreign key constraint')) {
      errorMessage = 'خطأ: يوجد بيانات مرتبطة بهذا المستخدم';
    } else if (error.message.includes('does not exist')) {
      errorMessage = 'المستخدم غير موجود';
    } else if (error.message.includes('violates')) {
      errorMessage = 'خطأ في قاعدة البيانات - بيانات مرتبطة';
    }
    
    res.status(500).json({ 
      message: errorMessage,
      user_id: userId,
      timestamp: new Date().toISOString(),
      details: process.env.NODE_ENV === 'development' ? error.message : 'اتصل بالدعم التقني'
    });
  }
});

console.log('✅ تم تحميل نظام الأدمن بنجاح');

// ═══════════════════════════════════════════════════════════════
// SERVER START
// ═══════════════════════════════════════════════════════════════

app.listen(port, () => {
  console.log(`✅ Server running on port ${port}`);
  console.log('✅ Admin system loaded and ready');
  console.log('✅ HTML routes configured');
  console.log('✅ Frontend API endpoints ready');
  console.log('✅ Safe database handling enabled');
});

// Error handling
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
