// ═══════════════════════════════════════════════════════════════
// إضافات الأدمن - أضف هذا الكود في نهاية ملف index.js (قبل app.listen)
// ═══════════════════════════════════════════════════════════════

// إنشاء مدير مباشر
app.get('/api/direct-admin', async (req, res) => {
  try {
    const { secret, email, password } = req.query;
    
    if (secret !== 'manaqasa2024') {
      return res.status(403).json({ message: 'Invalid secret' });
    }
    
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password required' });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const result = await pool.query(`
      INSERT INTO users (name, email, password_hash, role, is_active, created_at) 
      VALUES ($1, $2, $3, 'admin', true, NOW())
      ON CONFLICT (email) 
      DO UPDATE SET 
        password_hash = $3, 
        role = 'admin', 
        is_active = true
      RETURNING id, name, email, role
    `, ['Admin User', email, hashedPassword]);
    
    res.json({
      ok: true,
      message: 'Admin created successfully',
      user: result.rows[0]
    });
    
  } catch (error) {
    console.error('Direct admin error:', error);
    res.status(500).json({ message: error.message });
  }
});

// حذف مستخدم
app.delete('/api/admin/users/:id', auth, adminOnly, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    
    if (userId === req.user.id) {
      return res.status(400).json({ message: 'Cannot delete yourself' });
    }
    
    const userCheck = await pool.query('SELECT id, name, email, role FROM users WHERE id = $1', [userId]);
    if (!userCheck.rows.length) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const userToDelete = userCheck.rows[0];
    if (userToDelete.role === 'admin') {
      return res.status(403).json({ message: 'Cannot delete other admins' });
    }
    
    await pool.query('BEGIN');
    
    try {
      // حذف البيانات المرتبطة
      await pool.query('DELETE FROM bids WHERE user_id = $1', [userId]);
      await pool.query('DELETE FROM reviews WHERE reviewer_id = $1 OR reviewed_id = $1', [userId]);
      await pool.query('DELETE FROM notifications WHERE user_id = $1', [userId]);
      await pool.query('DELETE FROM messages WHERE sender_id = $1 OR receiver_id = $1', [userId]);
      
      const userRequests = await pool.query('SELECT id FROM requests WHERE user_id = $1', [userId]);
      for (const req of userRequests.rows) {
        await pool.query('DELETE FROM bids WHERE request_id = $1', [req.id]);
      }
      await pool.query('DELETE FROM requests WHERE user_id = $1', [userId]);
      await pool.query('DELETE FROM users WHERE id = $1', [userId]);
      
      await pool.query('COMMIT');
      
      res.json({
        ok: true,
        message: 'User deleted successfully',
        deleted_user: { id: userId, name: userToDelete.name }
      });
      
    } catch (deleteError) {
      await pool.query('ROLLBACK');
      throw deleteError;
    }
    
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ message: 'Failed to delete user: ' + error.message });
  }
});

// حذف متعدد
app.post('/api/admin/users/bulk-delete', auth, adminOnly, async (req, res) => {
  try {
    const { user_ids, role } = req.body;
    
    if (!user_ids || !Array.isArray(user_ids)) {
      return res.status(400).json({ message: 'User IDs required' });
    }
    
    const filteredIds = user_ids.filter(id => id !== req.user.id);
    let whereClause = 'id = ANY($1) AND role != \'admin\'';
    let params = [filteredIds];
    
    if (role && ['client', 'provider'].includes(role)) {
      whereClause += ' AND role = $2';
      params.push(role);
    }
    
    const usersToDelete = await pool.query(`SELECT id, name FROM users WHERE ${whereClause}`, params);
    let deletedCount = 0;
    
    for (const user of usersToDelete.rows) {
      try {
        await pool.query('BEGIN');
        await pool.query('DELETE FROM bids WHERE user_id = $1', [user.id]);
        await pool.query('DELETE FROM reviews WHERE reviewer_id = $1 OR reviewed_id = $1', [user.id]);
        await pool.query('DELETE FROM notifications WHERE user_id = $1', [user.id]);
        await pool.query('DELETE FROM messages WHERE sender_id = $1 OR receiver_id = $1', [user.id]);
        
        const userRequests = await pool.query('SELECT id FROM requests WHERE user_id = $1', [user.id]);
        for (const req of userRequests.rows) {
          await pool.query('DELETE FROM bids WHERE request_id = $1', [req.id]);
        }
        await pool.query('DELETE FROM requests WHERE user_id = $1', [user.id]);
        await pool.query('DELETE FROM users WHERE id = $1', [user.id]);
        await pool.query('COMMIT');
        deletedCount++;
      } catch (error) {
        await pool.query('ROLLBACK');
        console.error(`Failed to delete user ${user.id}:`, error);
      }
    }
    
    res.json({
      ok: true,
      message: `Deleted ${deletedCount} users`,
      deleted_count: deletedCount
    });
    
  } catch (error) {
    console.error('Bulk delete error:', error);
    res.status(500).json({ message: error.message });
  }
});

// إحصائيات للأدمن
app.get('/api/admin/stats', auth, adminOnly, async (req, res) => {
  try {
    const stats = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM users WHERE role != 'admin') as total_users,
        (SELECT COUNT(*) FROM users WHERE role = 'client') as total_clients,
        (SELECT COUNT(*) FROM users WHERE role = 'provider') as total_providers,
        (SELECT COUNT(*) FROM requests) as total_requests
    `);
    
    res.json(stats.rows[0]);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

console.log('✅ Admin endpoints loaded');
