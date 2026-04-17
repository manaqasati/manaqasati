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
    
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const result = await pool.query(
      'INSERT INTO users (name, email, password_hash, role, phone, is_active, created_at) VALUES ($1, $2, $3, $4, $5, true, NOW()) RETURNING id, name, email, role',
      [name, email, hashedPassword, role, phone]
    );
    
    const user = result.rows[0];
    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET || 'manaqasa-secret-2024');
    
    res.json({ user, token });
  } catch (error) {
    if (error.code === '23505') {
      res.status(400).json({ message: 'البريد الإلكتروني مستخدم مسبقاً' });
    } else {
      console.error('Register error:', error);
      res.status(500).json({ message: 'خطأ في التسجيل' });
    }
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (!result.rows.length) {
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
    
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const result = await pool.query(`
      INSERT INTO users (name, email, password_hash, role, is_active, created_at) 
      VALUES ('المدير', $1, $2, 'admin', true, NOW())
      ON CONFLICT (email) 
      DO UPDATE SET 
        password_hash = $2, 
        role = 'admin', 
        is_active = true
      RETURNING id, name, email, role
    `, [email, hashedPassword]);
    
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
    
    const stats = await pool.query(`
      SELECT 
        COUNT(*) FILTER (WHERE role != 'admin') as total_users,
        COUNT(*) FILTER (WHERE role = 'client') as total_clients,
        COUNT(*) FILTER (WHERE role = 'provider') as providers
      FROM users
    `);
    
    const requests = await pool.query(`
      SELECT 
        COUNT(*) as requests,
        COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress,
        COUNT(*) FILTER (WHERE status = 'completed') as completed,
        COUNT(*) FILTER (WHERE status = 'pending_review') as pending_review
      FROM requests
    `);
    
    const bids = await pool.query('SELECT COUNT(*) as total_bids FROM bids');
    
    const result = {
      total_users: parseInt(stats.rows[0].total_users) || 0,
      total_clients: parseInt(stats.rows[0].total_clients) || 0,
      providers: parseInt(stats.rows[0].providers) || 0,
      requests: parseInt(requests.rows[0].requests) || 0,
      in_progress: parseInt(requests.rows[0].in_progress) || 0,
      completed: parseInt(requests.rows[0].completed) || 0,
      pending_review: parseInt(requests.rows[0].pending_review) || 0,
      total_bids: parseInt(bids.rows[0].total_bids) || 0
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
    
    const result = await pool.query(query, params);
    
    console.log('✅ تم تحميل المستخدمين:', result.rows.length, 'مستخدم');
    res.json(result.rows);
    
  } catch (error) {
    console.error('❌ خطأ في تحميل المستخدمين:', error);
    res.status(500).json({ message: error.message });
  }
});

// ══ المزودون مع التفاصيل ══
app.get('/api/admin/providers', auth, adminOnly, async (req, res) => {
  try {
    console.log('🔧 تحميل المزودين مع التفاصيل...');
    
    const result = await pool.query(`
      SELECT 
        u.id, u.name, u.email, u.phone, u.city, u.specialties, 
        u.badge, u.is_active, u.bio, u.created_at, u.profile_image,
        COALESCE(AVG(r.rating), 0) as avg_rating,
        COUNT(DISTINCT r.id) as review_count,
        COUNT(DISTINCT b.id) as bid_count,
        COUNT(DISTINCT req.id) FILTER (WHERE req.status = 'completed') as completed_projects
      FROM users u
      LEFT JOIN reviews r ON r.reviewed_id = u.id
      LEFT JOIN bids b ON b.user_id = u.id
      LEFT JOIN requests req ON req.assigned_provider_id = u.id
      WHERE u.role = 'provider'
      GROUP BY u.id
      ORDER BY u.created_at DESC
    `);
    
    console.log('✅ تم تحميل المزودين:', result.rows.length, 'مزود');
    res.json(result.rows);
    
  } catch (error) {
    console.error('❌ خطأ في تحميل المزودين:', error);
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
    
    const result = await pool.query(
      'UPDATE users SET is_active = NOT is_active WHERE id = $1 AND role != \'admin\' RETURNING id, name, is_active',
      [userId]
    );
    
    if (!result.rows.length) {
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

// ══ منح لقب ══
app.put('/api/admin/users/:id/badge', auth, adminOnly, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { badge } = req.body;
    
    console.log('🏆 منح لقب للمستخدم:', userId, 'اللقب:', badge);
    
    const result = await pool.query(
      'UPDATE users SET badge = $1 WHERE id = $2 AND role != \'admin\' RETURNING id, name, badge',
      [badge, userId]
    );
    
    if (!result.rows.length) {
      console.log('❌ المستخدم غير موجود للقب:', userId);
      return res.status(404).json({ message: 'المستخدم غير موجود' });
    }
    
    console.log('✅ تم تحديث اللقب:', result.rows[0]);
    res.json(result.rows[0]);
    
  } catch (error) {
    console.error('❌ خطأ في تحديث اللقب:', error);
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
    
    // التحقق من وجود المستخدم
    console.log('🔍 فحص وجود المستخدم...');
    const userCheck = await pool.query(
      'SELECT id, name, email, role FROM users WHERE id = $1', 
      [userId]
    );
    
    if (!userCheck.rows.length) {
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
    await pool.query('BEGIN');
    
    try {
      console.log('🧹 المرحلة 1: تنظيف البيانات المرتبطة...');
      
      // 1. حذف العطاءات
      console.log('   - حذف عطاءات المستخدم...');
      const deleteBidsResult = await pool.query('DELETE FROM bids WHERE user_id = $1', [userId]);
      console.log('   ✓ تم حذف العطاءات:', deleteBidsResult.rowCount);
      
      // 2. حذف التقييمات
      console.log('   - حذف التقييمات...');
      const deleteReviewsResult = await pool.query(
        'DELETE FROM reviews WHERE reviewer_id = $1 OR reviewed_id = $1', 
        [userId]
      );
      console.log('   ✓ تم حذف التقييمات:', deleteReviewsResult.rowCount);
      
      // 3. حذف الإشعارات
      console.log('   - حذف الإشعارات...');
      const deleteNotifsResult = await pool.query('DELETE FROM notifications WHERE user_id = $1', [userId]);
      console.log('   ✓ تم حذف الإشعارات:', deleteNotifsResult.rowCount);
      
      // 4. حذف الرسائل
      console.log('   - حذف الرسائل...');
      const deleteMsgsResult = await pool.query(
        'DELETE FROM messages WHERE sender_id = $1 OR receiver_id = $1', 
        [userId]
      );
      console.log('   ✓ تم حذف الرسائل:', deleteMsgsResult.rowCount);
      
      // 5. حذف البلاغات
      console.log('   - حذف البلاغات...');
      const deleteReportsResult = await pool.query(
        'DELETE FROM reports WHERE reporter_id = $1 OR reported_id = $1', 
        [userId]
      );
      console.log('   ✓ تم حذف البلاغات:', deleteReportsResult.rowCount);
      
      console.log('🧹 المرحلة 2: معالجة طلبات المستخدم...');
      
      // 6. معالجة طلبات المستخدم
      const userRequests = await pool.query('SELECT id, title FROM requests WHERE user_id = $1', [userId]);
      console.log('   - تم العثور على طلبات المستخدم:', userRequests.rows.length);
      
      if (userRequests.rows.length > 0) {
        // حذف العطاءات على طلبات المستخدم
        for (const req of userRequests.rows) {
          console.log('     - حذف عطاءات الطلب:', req.id, req.title);
          await pool.query('DELETE FROM bids WHERE request_id = $1', [req.id]);
        }
        
        // حذف الطلبات
        console.log('   - حذف طلبات المستخدم...');
        const deleteRequestsResult = await pool.query('DELETE FROM requests WHERE user_id = $1', [userId]);
        console.log('   ✓ تم حذف الطلبات:', deleteRequestsResult.rowCount);
      }
      
      // 7. معالجة خاصة للمزودين
      if (userToDelete.role === 'provider') {
        console.log('🧹 المرحلة 3: تنظيف خاص بالمزود...');
        console.log('   - إلغاء تعيين المزود من الطلبات...');
        const unassignResult = await pool.query(
          'UPDATE requests SET assigned_provider_id = NULL WHERE assigned_provider_id = $1', 
          [userId]
        );
        console.log('   ✓ تم إلغاء التعيين من الطلبات:', unassignResult.rowCount);
      }
      
      console.log('🗑️ المرحلة 4: حذف المستخدم النهائي...');
      
      // 8. حذف المستخدم نفسه
      const deleteUserResult = await pool.query('DELETE FROM users WHERE id = $1', [userId]);
      console.log('   ✓ تم حذف سجل المستخدم:', deleteUserResult.rowCount);
      
      if (deleteUserResult.rowCount === 0) {
        throw new Error('فشل في حذف سجل المستخدم');
      }
      
      // تأكيد المعاملة
      await pool.query('COMMIT');
      
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
      await pool.query('ROLLBACK');
      console.error('💥 فشل معاملة الحذف');
      console.error('   الخطأ:', deleteError.message);
      console.error('   المسار:', deleteError.stack);
      throw deleteError;
    }
    
  } catch (error) {
    console.error('❌ فشل حذف المستخدم');
    console.error('   معرف المستخدم:', userId);
    console.error('   الخطأ:', error.message);
    console.error('   المسار:', error.stack);
    
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

// ══ الطلبات ══
app.get('/api/admin/requests', auth, adminOnly, async (req, res) => {
  try {
    console.log('📋 تحميل طلبات الأدمن...');
    
    const result = await pool.query(`
      SELECT 
        r.*,
        u.name as client_name,
        p.name as provider_name,
        (SELECT COUNT(*) FROM bids WHERE request_id = r.id) as bid_count
      FROM requests r
      LEFT JOIN users u ON u.id = r.user_id
      LEFT JOIN users p ON p.id = r.assigned_provider_id
      ORDER BY r.created_at DESC
      LIMIT 200
    `);
    
    console.log('✅ تم تحميل طلبات الأدمن:', result.rows.length);
    res.json(result.rows);
    
  } catch (error) {
    console.error('❌ خطأ في طلبات الأدمن:', error);
    res.status(500).json({ message: error.message });
  }
});

// ══ مراجعة الطلبات ══
app.put('/api/admin/requests/:id/review', auth, adminOnly, async (req, res) => {
  try {
    const requestId = parseInt(req.params.id);
    const { action, reason } = req.body;
    
    console.log('📋 مراجعة الطلب:', requestId, 'الإجراء:', action);
    
    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ message: 'إجراء غير صحيح' });
    }
    
    const newStatus = action === 'approve' ? 'open' : 'rejected';
    
    const result = await pool.query(
      'UPDATE requests SET status = $1, admin_notes = $2 WHERE id = $3 RETURNING *',
      [newStatus, reason || null, requestId]
    );
    
    if (!result.rows.length) {
      return res.status(404).json({ message: 'الطلب غير موجود' });
    }
    
    console.log('✅ تمت مراجعة الطلب:', action, requestId);
    res.json(result.rows[0]);
    
  } catch (error) {
    console.error('❌ خطأ في المراجعة:', error);
    res.status(500).json({ message: error.message });
  }
});

// ══ إنهاء مشروع ══
app.put('/api/admin/requests/:id/complete', auth, adminOnly, async (req, res) => {
  try {
    const requestId = parseInt(req.params.id);
    
    console.log('✅ إنهاء الطلب:', requestId);
    
    const result = await pool.query(
      'UPDATE requests SET status = \'completed\', completed_at = NOW() WHERE id = $1 RETURNING *',
      [requestId]
    );
    
    if (!result.rows.length) {
      return res.status(404).json({ message: 'الطلب غير موجود' });
    }
    
    console.log('✅ تم إنهاء الطلب:', requestId);
    res.json(result.rows[0]);
    
  } catch (error) {
    console.error('❌ خطأ في الإنهاء:', error);
    res.status(500).json({ message: error.message });
  }
});

// ══ حذف طلب ══
app.delete('/api/admin/requests/:id', auth, adminOnly, async (req, res) => {
  try {
    const requestId = parseInt(req.params.id);
    
    console.log('🗑️ حذف الطلب:', requestId);
    
    // حذف العطاءات أولاً
    await pool.query('DELETE FROM bids WHERE request_id = $1', [requestId]);
    
    // حذف الطلب
    const result = await pool.query('DELETE FROM requests WHERE id = $1', [requestId]);
    
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'الطلب غير موجود' });
    }
    
    console.log('✅ تم حذف الطلب:', requestId);
    res.json({ ok: true, message: 'تم حذف الطلب' });
    
  } catch (error) {
    console.error('❌ خطأ في حذف الطلب:', error);
    res.status(500).json({ message: error.message });
  }
});

// ══ البلاغات ══
app.get('/api/admin/reports', auth, adminOnly, async (req, res) => {
  try {
    console.log('🚨 تحميل البلاغات...');
    
    const result = await pool.query(`
      SELECT 
        r.*,
        reporter.name as reporter_name,
        reported.name as reported_name
      FROM reports r
      LEFT JOIN users reporter ON reporter.id = r.reporter_id
      LEFT JOIN users reported ON reported.id = r.reported_id
      ORDER BY r.created_at DESC
    `);
    
    console.log('✅ تم تحميل البلاغات:', result.rows.length);
    res.json(result.rows);
    
  } catch (error) {
    console.error('❌ خطأ في البلاغات:', error);
    res.status(500).json({ message: error.message });
  }
});

// ══ معالجة البلاغات ══
app.put('/api/admin/reports/:id', auth, adminOnly, async (req, res) => {
  try {
    const reportId = parseInt(req.params.id);
    const { action, admin_note } = req.body;
    
    console.log('🚨 معالجة البلاغ:', reportId, 'الإجراء:', action);
    
    if (!['warn', 'ban', 'ignore'].includes(action)) {
      return res.status(400).json({ message: 'إجراء غير صحيح' });
    }
    
    let newStatus;
    switch (action) {
      case 'warn': newStatus = 'warned'; break;
      case 'ban': newStatus = 'resolved'; break;
      case 'ignore': newStatus = 'ignored'; break;
    }
    
    // تحديث البلاغ
    await pool.query(
      'UPDATE reports SET status = $1, admin_note = $2, resolved_at = NOW() WHERE id = $3',
      [newStatus, admin_note, reportId]
    );
    
    // تنفيذ الإجراء على المستخدم
    if (action === 'ban') {
      const report = await pool.query('SELECT reported_id FROM reports WHERE id = $1', [reportId]);
      if (report.rows.length) {
        await pool.query('UPDATE users SET is_active = false WHERE id = $1', [report.rows[0].reported_id]);
        console.log('🚫 تم إيقاف المستخدم:', report.rows[0].reported_id);
      }
    }
    
    console.log('✅ تمت معالجة البلاغ:', action, reportId);
    res.json({ ok: true, message: 'تم تنفيذ الإجراء' });
    
  } catch (error) {
    console.error('❌ خطأ في معالجة البلاغ:', error);
    res.status(500).json({ message: error.message });
  }
});

// ══ التقييمات ══
app.get('/api/admin/reviews', auth, adminOnly, async (req, res) => {
  try {
    console.log('⭐ تحميل التقييمات...');
    
    const result = await pool.query(`
      SELECT 
        r.*,
        reviewer.name as reviewer_name,
        reviewed.name as reviewed_name
      FROM reviews r
      LEFT JOIN users reviewer ON reviewer.id = r.reviewer_id
      LEFT JOIN users reviewed ON reviewed.id = r.reviewed_id
      ORDER BY r.created_at DESC
    `);
    
    console.log('✅ تم تحميل التقييمات:', result.rows.length);
    res.json(result.rows);
    
  } catch (error) {
    console.error('❌ خطأ في التقييمات:', error);
    res.status(500).json({ message: error.message });
  }
});

// ══ حذف تقييم ══
app.delete('/api/admin/reviews/:id', auth, adminOnly, async (req, res) => {
  try {
    const reviewId = parseInt(req.params.id);
    
    console.log('🗑️ حذف التقييم:', reviewId);
    
    const result = await pool.query('DELETE FROM reviews WHERE id = $1', [reviewId]);
    
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'التقييم غير موجود' });
    }
    
    console.log('✅ تم حذف التقييم:', reviewId);
    res.json({ ok: true, message: 'تم حذف التقييم' });
    
  } catch (error) {
    console.error('❌ خطأ في حذف التقييم:', error);
    res.status(500).json({ message: error.message });
  }
});

// ══ إرسال إشعار ══
app.post('/api/admin/notify', auth, adminOnly, async (req, res) => {
  try {
    const { user_id, role, title, body, type, channel } = req.body;
    
    console.log('📢 إرسال إشعار:', title, 'إلى:', user_id || role || 'الكل');
    
    if (!title || !body) {
      return res.status(400).json({ message: 'العنوان والمحتوى مطلوبان' });
    }
    
    let targetUsers = [];
    
    if (user_id) {
      // إرسال لمستخدم محدد
      const user = await pool.query('SELECT id, name FROM users WHERE id = $1', [user_id]);
      targetUsers = user.rows;
    } else if (role && ['client', 'provider'].includes(role)) {
      // إرسال لفئة معينة
      const users = await pool.query('SELECT id, name FROM users WHERE role = $1 AND is_active = true', [role]);
      targetUsers = users.rows;
    } else {
      // إرسال للجميع
      const users = await pool.query('SELECT id, name FROM users WHERE role != \'admin\' AND is_active = true');
      targetUsers = users.rows;
    }
    
    // إدراج الإشعارات
    for (const user of targetUsers) {
      await pool.query(
        'INSERT INTO notifications (user_id, title, body, type, is_read, created_at) VALUES ($1, $2, $3, $4, false, NOW())',
        [user.id, title, body, type || 'admin']
      );
    }
    
    console.log('✅ تم إرسال الإشعارات إلى:', targetUsers.length, 'مستخدم');
    
    res.json({
      ok: true,
      message: `تم إرسال الإشعار لـ ${targetUsers.length} مستخدم`,
      sent_count: targetUsers.length
    });
    
  } catch (error) {
    console.error('❌ خطأ في الإشعار:', error);
    res.status(500).json({ message: error.message });
  }
});

// ══ بحث سريع ══
app.get('/api/admin/search', auth, adminOnly, async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || q.length < 2) {
      return res.json({ requests: [], users: [] });
    }
    
    console.log('🔍 بحث الأدمن:', q);
    
    const searchTerm = `%${q}%`;
    
    // البحث في الطلبات
    const requests = await pool.query(`
      SELECT r.id, r.title, r.status, u.name as client_name
      FROM requests r
      LEFT JOIN users u ON u.id = r.user_id
      WHERE r.title ILIKE $1 OR u.name ILIKE $1
      ORDER BY r.created_at DESC
      LIMIT 10
    `, [searchTerm]);
    
    // البحث في المستخدمين
    const users = await pool.query(`
      SELECT id, name, email, role
      FROM users
      WHERE (name ILIKE $1 OR email ILIKE $1) AND role != 'admin'
      ORDER BY name
      LIMIT 10
    `, [searchTerm]);
    
    console.log('✅ اكتمل البحث:', requests.rows.length, 'طلبات،', users.rows.length, 'مستخدمين');
    
    res.json({
      requests: requests.rows,
      users: users.rows
    });
    
  } catch (error) {
    console.error('❌ خطأ في البحث:', error);
    res.status(500).json({ message: error.message });
  }
});

// ══ النظام جاهز ══
console.log('✅ تم تحميل نظام الأدمن بنجاح');
console.log('   - التوثيق والصلاحيات: ✓');
console.log('   - إدارة المستخدمين: ✓');
console.log('   - نقطة نهاية الحذف: ✓ (مع الأمان في المعاملات)');
console.log('   - إدارة الطلبات: ✓');
console.log('   - البلاغات والتقييمات: ✓');
console.log('   - الإشعارات: ✓');
console.log('   - البحث: ✓');
console.log('🚀 جاهز لمعالجة طلبات الأدمن');

// ═══════════════════════════════════════════════════════════════
// SERVER START
// ═══════════════════════════════════════════════════════════════

app.listen(port, () => {
  console.log(`✅ Server running on port ${port}`);
  console.log('✅ Admin system loaded and ready');
  console.log('✅ HTML routes configured');
});

// Error handling
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
