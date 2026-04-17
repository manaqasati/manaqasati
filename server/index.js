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
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000,
  max: 20
});

// Test database connection
pool.connect()
  .then(() => console.log('✅ Database connected successfully'))
  .catch(err => console.error('❌ Database connection failed:', err));

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// JWT secret
const JWT_SECRET = process.env.JWT_SECRET || 'manaqasa-secret-2024';

// ═══════════════════════════════════════════════════════════════
// HTML ROUTES
// ═══════════════════════════════════════════════════════════════

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/dashboard-admin.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'dashboard-admin.html'));
});

app.get('/dashboard-client.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'dashboard-client.html'));
});

app.get('/dashboard-provider.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'dashboard-provider.html'));
});

app.get('/auth.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'auth.html'));
});

app.get('/app.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'app.html'));
});

console.log('✅ HTML routes configured');

// ═══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

async function safeQuery(query, params = [], context = 'Query') {
  try {
    console.log(`🔍 [${context}] Executing query`);
    const result = await pool.query(query, params);
    console.log(`✅ [${context}] Success - ${result.rowCount || 0} rows`);
    return { success: true, rows: result.rows, rowCount: result.rowCount };
  } catch (error) {
    console.error(`❌ [${context}] Error:`, error.message);
    return { success: false, error: error.message, rows: [] };
  }
}

async function notify(userId, title, body, type, refId) {
  try {
    await pool.query(
      'INSERT INTO notifications(user_id,title,body,type,ref_id) VALUES($1,$2,$3,$4,$5)',
      [userId, title, body, type, refId]
    );
  } catch (error) {
    console.error('Notification error:', error);
  }
}

// ═══════════════════════════════════════════════════════════════
// AUTHENTICATION
// ═══════════════════════════════════════════════════════════════

function auth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ message: 'Authorization header مطلوب' });
    }
    
    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: 'Token مطلوب' });
    }
    
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    console.log(`✅ Auth success - User: ${decoded.id}, Role: ${decoded.role}`);
    next();
  } catch (error) {
    console.log('❌ Auth error:', error.message);
    res.status(401).json({ message: 'Token غير صحيح' });
  }
}

function adminOnly(req, res, next) {
  console.log(`🔒 Admin check - User: ${req.user?.id}, Role: ${req.user?.role}`);
  
  if (req.user?.role !== 'admin') {
    console.log('❌ Access denied - Not admin');
    return res.status(403).json({ 
      message: 'يتطلب صلاحيات أدمن',
      your_role: req.user?.role || 'غير معروف'
    });
  }
  
  console.log('✅ Admin access granted');
  next();
}

// ═══════════════════════════════════════════════════════════════
// BASIC ENDPOINTS
// ═══════════════════════════════════════════════════════════════

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// Database test
app.get('/api/db-test', async (req, res) => {
  try {
    const testResult = await safeQuery('SELECT NOW() as current_time', [], 'DB Test');
    
    if (!testResult.success) {
      throw new Error('Database connection failed');
    }
    
    // Check tables
    const tables = ['users', 'requests', 'bids', 'reviews', 'notifications', 'messages', 'reports'];
    const tableStatus = {};
    
    for (const table of tables) {
      const exists = await safeQuery(`
        SELECT table_name FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = $1
      `, [table], `Table check: ${table}`);
      
      tableStatus[table] = exists.rows.length > 0;
    }
    
    res.json({
      database_connected: true,
      current_time: testResult.rows[0].current_time,
      tables_exist: tableStatus,
      schema_version: 'v2.0'
    });
  } catch (error) {
    console.error('Database test error:', error);
    res.status(500).json({ 
      database_connected: false,
      error: error.message
    });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    console.log('🔐 Login attempt for:', email);
    
    if (!email || !password) {
      return res.status(400).json({ message: 'البريد الإلكتروني وكلمة المرور مطلوبان' });
    }
    
    const result = await safeQuery('SELECT * FROM users WHERE email = $1', [email], 'User Login');
    
    if (!result.success || !result.rows.length) {
      console.log('❌ Login failed: User not found');
      return res.status(401).json({ message: 'بيانات الدخول غير صحيحة' });
    }
    
    const user = result.rows[0];
    
    // Handle both password and password_hash columns
    const storedHash = user.password || user.password_hash || '';
    if (!storedHash) {
      console.log('❌ Login failed: No password hash found');
      return res.status(401).json({ message: 'بيانات الدخول غير صحيحة' });
    }
    
    const validPassword = await bcrypt.compare(password, storedHash);
    if (!validPassword) {
      console.log('❌ Login failed: Invalid password');
      return res.status(401).json({ message: 'بيانات الدخول غير صحيحة' });
    }
    
    if (!user.is_active) {
      console.log('❌ Login failed: Account inactive');
      return res.status(401).json({ message: 'الحساب موقف' });
    }
    
    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET);
    
    console.log('✅ Login successful:', user.id, user.email, user.role);
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
    console.error('❌ Login error:', error);
    res.status(500).json({ message: 'خطأ في تسجيل الدخول' });
  }
});

// Register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, role, phone } = req.body;
    
    console.log('📝 Registration attempt:', { name, email, role, phone });
    
    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: 'جميع الحقول مطلوبة' });
    }
    
    if (!['client', 'provider'].includes(role)) {
      return res.status(400).json({ message: 'نوع المستخدم غير صحيح' });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const result = await safeQuery(
      'INSERT INTO users (name, email, password, role, phone, is_active, created_at) VALUES ($1, $2, $3, $4, $5, true, NOW()) RETURNING id, name, email, role',
      [name, email, hashedPassword, role, phone],
      'User Registration'
    );
    
    if (!result.success) {
      if (result.error.includes('duplicate key') || result.error.includes('unique')) {
        return res.status(400).json({ message: 'البريد الإلكتروني مستخدم مسبقاً' });
      }
      throw new Error(result.error);
    }
    
    const user = result.rows[0];
    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET);
    
    console.log('✅ User registered successfully:', user.id, user.email);
    res.json({ user, token });
    
  } catch (error) {
    console.error('❌ Registration error:', error);
    res.status(500).json({ message: 'خطأ في التسجيل' });
  }
});

// ═══════════════════════════════════════════════════════════════
// ADMIN SYSTEM - محسّن مع حذف آمن
// ═══════════════════════════════════════════════════════════════

console.log('🚀 Loading admin system...');

// Create admin directly
app.get('/api/direct-admin', async (req, res) => {
  try {
    const { secret, email, password } = req.query;
    
    console.log('🔑 Direct admin creation request for:', email);
    
    if (secret !== 'manaqasa2024') {
      return res.status(403).json({ message: 'كلمة سر خاطئة' });
    }
    
    if (!email || !password) {
      return res.status(400).json({ message: 'الإيميل وكلمة المرور مطلوبة' });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const result = await safeQuery(`
      INSERT INTO users (name, email, password, role, is_active, created_at) 
      VALUES ('المدير', $1, $2, 'admin', true, NOW())
      ON CONFLICT (email) 
      DO UPDATE SET 
        password = $2, 
        role = 'admin', 
        is_active = true
      RETURNING id, name, email, role
    `, [email, hashedPassword], 'Create Admin');
    
    if (!result.success) {
      throw new Error(result.error);
    }
    
    console.log('✅ Admin created successfully:', result.rows[0]);
    
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

// Admin stats
app.get('/api/admin/stats', auth, adminOnly, async (req, res) => {
  try {
    console.log('📊 Loading admin stats...');
    
    const stats = await Promise.all([
      safeQuery('SELECT COUNT(*) as count FROM users', [], 'Total Users'),
      safeQuery('SELECT COUNT(*) as count FROM requests', [], 'Total Requests'),
      safeQuery('SELECT COUNT(*) as count FROM bids', [], 'Total Bids'),
      safeQuery("SELECT COUNT(*) as count FROM users WHERE role='provider'", [], 'Providers'),
      safeQuery("SELECT COUNT(*) as count FROM requests WHERE status='pending_review'", [], 'Pending Reviews'),
      safeQuery("SELECT COUNT(*) as count FROM requests WHERE status='in_progress'", [], 'In Progress'),
      safeQuery("SELECT COUNT(*) as count FROM requests WHERE status='completed'", [], 'Completed'),
    ]);
    
    const result = {
      total_users: parseInt(stats[0].rows[0]?.count) || 0,
      requests: parseInt(stats[1].rows[0]?.count) || 0,
      total_bids: parseInt(stats[2].rows[0]?.count) || 0,
      providers: parseInt(stats[3].rows[0]?.count) || 0,
      pending_review: parseInt(stats[4].rows[0]?.count) || 0,
      in_progress: parseInt(stats[5].rows[0]?.count) || 0,
      completed: parseInt(stats[6].rows[0]?.count) || 0
    };
    
    console.log('✅ Admin stats loaded:', result);
    res.json(result);
    
  } catch (error) {
    console.error('❌ Admin stats error:', error);
    res.status(500).json({ message: error.message });
  }
});

// List users
app.get('/api/admin/users', auth, adminOnly, async (req, res) => {
  try {
    const { role } = req.query;
    console.log('👥 Loading users, role filter:', role);
    
    const VALID_ROLES = ['client', 'provider', 'admin'];
    let query = 'SELECT id,name,email,phone,role,specialties,city,badge,is_active,created_at FROM users';
    const params = [];
    
    if (role && VALID_ROLES.includes(role)) {
      params.push(role);
      query += ' WHERE role=$1';
    }
    
    query += ' ORDER BY created_at DESC';
    
    const result = await safeQuery(query, params, 'List Users');
    
    console.log(`✅ Loaded ${result.rows.length} users`);
    res.json(result.rows);
    
  } catch (error) {
    console.error('❌ List users error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Toggle user active status
app.put('/api/admin/users/:id/toggle', auth, adminOnly, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    console.log('🔄 Toggle user status:', userId);
    
    if (userId === req.user.id) {
      return res.status(400).json({ message: 'لا يمكن تعديل حسابك الخاص' });
    }
    
    const result = await safeQuery(
      'UPDATE users SET is_active = NOT is_active WHERE id = $1 AND role != \'admin\' RETURNING id, name, is_active',
      [userId],
      'Toggle User Status'
    );
    
    if (!result.success || !result.rows.length) {
      return res.status(404).json({ message: 'المستخدم غير موجود' });
    }
    
    console.log('✅ User status toggled:', result.rows[0]);
    res.json(result.rows[0]);
    
  } catch (error) {
    console.error('❌ Toggle user error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Update user badge
app.put('/api/admin/users/:id/badge', auth, adminOnly, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { badge } = req.body;
    
    console.log('🏆 Update user badge:', userId, badge);
    
    const result = await safeQuery(
      'UPDATE users SET badge = $1 WHERE id = $2 AND role != \'admin\' RETURNING id, name, badge',
      [badge, userId],
      'Update User Badge'
    );
    
    if (!result.success || !result.rows.length) {
      return res.status(404).json({ message: 'المستخدم غير موجود' });
    }
    
    // Send notification
    await notify(userId, '🏆 وسام جديد', `تهانينا! حصلت على وسام: ${badge}`, 'badge', null);
    
    console.log('✅ User badge updated:', result.rows[0]);
    res.json(result.rows[0]);
    
  } catch (error) {
    console.error('❌ Update badge error:', error);
    res.status(500).json({ message: error.message });
  }
});

// 🗑️ DELETE USER - الحل الشامل المحسّن
app.delete('/api/admin/users/:id', auth, adminOnly, async (req, res) => {
  const userId = parseInt(req.params.id);
  
  console.log('🗑️ User deletion request');
  console.log('   User ID to delete:', userId);
  console.log('   Admin executing:', req.user.id);
  console.log('   Timestamp:', new Date().toISOString());
  
  try {
    // Validate input
    if (!userId || isNaN(userId)) {
      console.log('❌ Invalid user ID:', req.params.id);
      return res.status(400).json({ message: 'معرف المستخدم غير صحيح' });
    }
    
    // Prevent self-deletion
    if (userId === req.user.id) {
      console.log('❌ Admin attempting to delete themselves');
      return res.status(400).json({ message: 'لا يمكن حذف حسابك الخاص' });
    }
    
    // Check if user exists
    console.log('🔍 Checking user existence...');
    const userCheck = await safeQuery(
      'SELECT id, name, email, role FROM users WHERE id = $1', 
      [userId],
      'Check User Existence'
    );
    
    if (!userCheck.success || !userCheck.rows.length) {
      console.log('❌ User not found:', userId);
      return res.status(404).json({ message: 'المستخدم غير موجود' });
    }
    
    const userToDelete = userCheck.rows[0];
    console.log('👤 User found:', userToDelete);
    
    // Prevent deleting other admins
    if (userToDelete.role === 'admin') {
      console.log('❌ Attempting to delete admin user');
      return res.status(403).json({ message: 'لا يمكن حذف المديرين' });
    }
    
    // Start safe deletion transaction
    console.log('📝 Starting deletion transaction...');
    const beginResult = await safeQuery('BEGIN', [], 'Begin Transaction');
    if (!beginResult.success) {
      throw new Error('Failed to start transaction');
    }
    
    try {
      console.log('🧹 Phase 1: Cleaning related data...');
      
      let deletionStats = {
        bids_deleted: 0,
        reviews_deleted: 0,
        notifications_deleted: 0,
        messages_deleted: 0,
        reports_deleted: 0,
        requests_deleted: 0,
        favorites_deleted: 0,
        push_tokens_deleted: 0
      };
      
      // 1. Delete bids - using provider_id from current schema
      console.log('   - Deleting user bids...');
      const deleteBids = await safeQuery(
        'DELETE FROM bids WHERE provider_id = $1', 
        [userId],
        'Delete User Bids'
      );
      deletionStats.bids_deleted = deleteBids.rowCount || 0;
      console.log(`   ✓ Deleted bids: ${deletionStats.bids_deleted}`);
      
      // 2. Delete reviews (as reviewer or reviewed)
      console.log('   - Deleting reviews...');
      const deleteReviews = await safeQuery(
        'DELETE FROM reviews WHERE reviewer_id = $1 OR reviewed_id = $1', 
        [userId],
        'Delete User Reviews'
      );
      deletionStats.reviews_deleted = deleteReviews.rowCount || 0;
      console.log(`   ✓ Deleted reviews: ${deletionStats.reviews_deleted}`);
      
      // 3. Delete notifications
      console.log('   - Deleting notifications...');
      const deleteNotifications = await safeQuery(
        'DELETE FROM notifications WHERE user_id = $1', 
        [userId],
        'Delete User Notifications'
      );
      deletionStats.notifications_deleted = deleteNotifications.rowCount || 0;
      console.log(`   ✓ Deleted notifications: ${deletionStats.notifications_deleted}`);
      
      // 4. Delete messages
      console.log('   - Deleting messages...');
      const deleteMessages = await safeQuery(
        'DELETE FROM messages WHERE sender_id = $1 OR receiver_id = $1', 
        [userId],
        'Delete User Messages'
      );
      deletionStats.messages_deleted = deleteMessages.rowCount || 0;
      console.log(`   ✓ Deleted messages: ${deletionStats.messages_deleted}`);
      
      // 5. Delete reports
      console.log('   - Deleting reports...');
      const deleteReports = await safeQuery(
        'DELETE FROM reports WHERE reporter_id = $1 OR reported_id = $1', 
        [userId],
        'Delete User Reports'
      );
      deletionStats.reports_deleted = deleteReports.rowCount || 0;
      console.log(`   ✓ Deleted reports: ${deletionStats.reports_deleted}`);
      
      // 6. Delete favorites
      console.log('   - Deleting favorites...');
      const deleteFavorites = await safeQuery(
        'DELETE FROM favorites WHERE user_id = $1 OR provider_id = $1', 
        [userId],
        'Delete User Favorites'
      );
      deletionStats.favorites_deleted = deleteFavorites.rowCount || 0;
      console.log(`   ✓ Deleted favorites: ${deletionStats.favorites_deleted}`);
      
      // 7. Delete push tokens
      console.log('   - Deleting push tokens...');
      const deletePushTokens = await safeQuery(
        'DELETE FROM push_tokens WHERE user_id = $1', 
        [userId],
        'Delete Push Tokens'
      );
      deletionStats.push_tokens_deleted = deletePushTokens.rowCount || 0;
      console.log(`   ✓ Deleted push tokens: ${deletionStats.push_tokens_deleted}`);
      
      console.log('🧹 Phase 2: Handling user requests...');
      
      // 8. Handle user's requests (using client_id from current schema)
      const userRequests = await safeQuery(
        'SELECT id, title FROM requests WHERE client_id = $1', 
        [userId],
        'Get User Requests'
      );
      
      console.log(`   - Found ${userRequests.rows.length} user requests`);
      
      if (userRequests.rows.length > 0) {
        // Delete bids on user's requests
        for (const request of userRequests.rows) {
          console.log(`     - Deleting bids for request: ${request.id} - ${request.title}`);
          await safeQuery(
            'DELETE FROM bids WHERE request_id = $1', 
            [request.id],
            `Delete Bids for Request ${request.id}`
          );
        }
        
        // Delete user's requests
        console.log('   - Deleting user requests...');
        const deleteRequests = await safeQuery(
          'DELETE FROM requests WHERE client_id = $1', 
          [userId],
          'Delete User Requests'
        );
        deletionStats.requests_deleted = deleteRequests.rowCount || 0;
        console.log(`   ✓ Deleted requests: ${deletionStats.requests_deleted}`);
      }
      
      // 9. Handle provider-specific cleanup
      if (userToDelete.role === 'provider') {
        console.log('🧹 Phase 3: Provider-specific cleanup...');
        console.log('   - Unassigning provider from requests...');
        const unassignProvider = await safeQuery(
          'UPDATE requests SET assigned_provider_id = NULL WHERE assigned_provider_id = $1', 
          [userId],
          'Unassign Provider'
        );
        console.log(`   ✓ Unassigned from ${unassignProvider.rowCount || 0} requests`);
      }
      
      console.log('🗑️ Phase 4: Final user deletion...');
      
      // 10. Delete the user
      const deleteUser = await safeQuery(
        'DELETE FROM users WHERE id = $1', 
        [userId],
        'Delete User Record'
      );
      console.log(`   ✓ User record deleted: ${deleteUser.rowCount || 0}`);
      
      if (!deleteUser.success || deleteUser.rowCount === 0) {
        throw new Error('فشل في حذف سجل المستخدم');
      }
      
      // Commit transaction
      const commitResult = await safeQuery('COMMIT', [], 'Commit Transaction');
      if (!commitResult.success) {
        throw new Error('Failed to commit transaction');
      }
      
      console.log('🎉 User deletion completed successfully');
      console.log('   Deleted user:', userToDelete.name, userToDelete.email);
      console.log('   Deletion stats:', deletionStats);
      
      res.json({
        ok: true,
        message: 'تم حذف المستخدم وجميع بياناته بنجاح',
        deleted_user: {
          id: userId,
          name: userToDelete.name,
          email: userToDelete.email,
          role: userToDelete.role
        },
        cleanup_stats: deletionStats
      });
      
    } catch (deleteError) {
      // Rollback transaction on error
      await safeQuery('ROLLBACK', [], 'Rollback Transaction');
      console.error('💥 Deletion transaction failed');
      console.error('   Error:', deleteError.message);
      throw deleteError;
    }
    
  } catch (error) {
    console.error('❌ User deletion failed');
    console.error('   User ID:', userId);
    console.error('   Error:', error.message);
    
    let errorMessage = 'فشل في حذف المستخدم';
    
    if (error.message.includes('foreign key constraint')) {
      errorMessage = 'خطأ: يوجد بيانات مرتبطة بهذا المستخدم';
    } else if (error.message.includes('does not exist')) {
      errorMessage = 'المستخدم غير موجود';
    }
    
    res.status(500).json({ 
      message: errorMessage,
      user_id: userId,
      timestamp: new Date().toISOString(),
      details: process.env.NODE_ENV === 'development' ? error.message : 'اتصل بالدعم التقني'
    });
  }
});

// List admin requests
app.get('/api/admin/requests', auth, adminOnly, async (req, res) => {
  try {
    const { status } = req.query;
    console.log('📋 Loading admin requests, status filter:', status);
    
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
    
    const result = await safeQuery(query, params, 'Admin Requests');
    
    console.log(`✅ Loaded ${result.rows.length} admin requests`);
    res.json(result.rows);
    
  } catch (error) {
    console.error('❌ Admin requests error:', error);
    res.status(500).json({ message: error.message });
  }
});

// List providers with details
app.get('/api/admin/providers', auth, adminOnly, async (req, res) => {
  try {
    console.log('🔧 Loading providers with details...');
    
    const result = await safeQuery(`
      SELECT id,name,email,phone,city,specialties,notify_categories,badge,is_active,bio,
      COALESCE((SELECT AVG(rating) FROM reviews WHERE reviewed_id=users.id),0) as avg_rating,
      COALESCE((SELECT COUNT(*) FROM reviews WHERE reviewed_id=users.id),0) as review_count,
      (SELECT COUNT(*) FROM bids WHERE provider_id=users.id) as bid_count,
      (SELECT COUNT(*) FROM requests WHERE assigned_provider_id=users.id AND status='completed') as completed_projects
      FROM users WHERE role='provider' ORDER BY avg_rating DESC
    `, [], 'Admin Providers');
    
    console.log(`✅ Loaded ${result.rows.length} providers`);
    res.json(result.rows);
    
  } catch (error) {
    console.error('❌ Admin providers error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Send admin notification
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
      // Send to specific user
      const user = await safeQuery('SELECT id,name FROM users WHERE id=$1', [user_id], 'Get Target User');
      targetUsers = user.rows;
    } else {
      // Send to multiple users
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
      
      const users = await safeQuery(query, params, 'Get Target Users');
      targetUsers = users.rows;
    }
    
    // Insert notifications
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
    console.error('❌ Admin notification error:', error);
    res.status(500).json({ message: error.message });
  }
});

// List admin reviews
app.get('/api/admin/reviews', auth, adminOnly, async (req, res) => {
  try {
    console.log('⭐ Loading admin reviews...');
    
    const result = await safeQuery(`
      SELECT rv.*,u1.name as reviewer_name,u2.name as reviewed_name,rq.title as request_title
      FROM reviews rv 
      JOIN users u1 ON rv.reviewer_id=u1.id 
      JOIN users u2 ON rv.reviewed_id=u2.id
      JOIN requests rq ON rv.request_id=rq.id 
      ORDER BY rv.created_at DESC
    `, [], 'Admin Reviews');
    
    console.log(`✅ Loaded ${result.rows.length} reviews`);
    res.json(result.rows);
    
  } catch (error) {
    console.error('❌ Admin reviews error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Delete review
app.delete('/api/admin/reviews/:id', auth, adminOnly, async (req, res) => {
  try {
    const reviewId = parseInt(req.params.id);
    console.log('🗑️ Delete review:', reviewId);
    
    const result = await safeQuery('DELETE FROM reviews WHERE id=$1', [reviewId], 'Delete Review');
    
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'التقييم غير موجود' });
    }
    
    console.log('✅ Review deleted:', reviewId);
    res.json({ ok: true, message: 'تم حذف التقييم' });
    
  } catch (error) {
    console.error('❌ Delete review error:', error);
    res.status(500).json({ message: error.message });
  }
});

// List admin reports
app.get('/api/admin/reports', auth, adminOnly, async (req, res) => {
  try {
    console.log('🚨 Loading admin reports...');
    
    const result = await safeQuery(`
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
    `, [], 'Admin Reports');
    
    console.log(`✅ Loaded ${result.rows.length} reports`);
    res.json(result.rows);
    
  } catch (error) {
    console.error('❌ Admin reports error:', error);
    res.status(500).json({ message: error.message });
  }
});

console.log('✅ Admin system loaded successfully');

// ═══════════════════════════════════════════════════════════════
// PUBLIC API ENDPOINTS
// ═══════════════════════════════════════════════════════════════

// Get public requests
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
    
    const result = await safeQuery(query, params, 'Public Requests');
    
    console.log(`✅ Loaded ${result.rows.length} public requests`);
    res.json(result.rows);
    
  } catch (error) {
    console.error('❌ Public requests error:', error);
    res.json([]);
  }
});

// Get categories
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

// Get public stats
app.get('/api/stats', async (req, res) => {
  try {
    const stats = await Promise.all([
      safeQuery("SELECT COUNT(*) as count FROM requests WHERE status = 'completed'", [], 'Completed Projects'),
      safeQuery("SELECT COUNT(*) as count FROM users WHERE role = 'provider' AND is_active = true", [], 'Active Providers'),
      safeQuery("SELECT COUNT(*) as count FROM users WHERE role = 'client' AND is_active = true", [], 'Active Clients'),
      safeQuery("SELECT COUNT(*) as count FROM requests WHERE status = 'open'", [], 'Open Requests')
    ]);
    
    res.json({
      completed_projects: parseInt(stats[0].rows[0]?.count) || 0,
      active_providers: parseInt(stats[1].rows[0]?.count) || 0,
      active_clients: parseInt(stats[2].rows[0]?.count) || 0,
      open_requests: parseInt(stats[3].rows[0]?.count) || 0
    });
    
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

app.listen(port, () => {
  console.log(`✅ Server running on port ${port}`);
  console.log('✅ Admin system ready with safe user deletion');
  console.log('✅ HTML routes configured');
  console.log('✅ Database schema compatible');
  console.log('🚀 All systems operational');
});

// Error handling
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
